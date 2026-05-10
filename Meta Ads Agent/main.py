"""
Meta Ads AI Agent
Claude (claude-sonnet-4-6) + Meta Marketing API
Capabilities: performance reports · campaign management · spend monitoring
"""
import json
from anthropic import Anthropic
from config import get_settings
import reports
import campaigns
import monitor
import sheets

settings = get_settings()
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# ─── Tool definitions ────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_campaign_insights",
        "description": (
            "Get performance metrics for all campaigns: impressions, clicks, spend, CTR, CPC, reach. "
            "Use this for any performance report request."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "date_preset": {
                    "type": "string",
                    "enum": ["today", "yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"],
                    "description": "Date range for the report. Defaults to last_7d.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_ad_insights",
        "description": "Get performance metrics broken down by individual ad (most granular level).",
        "input_schema": {
            "type": "object",
            "properties": {
                "date_preset": {
                    "type": "string",
                    "enum": ["today", "yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"],
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_account_spend_summary",
        "description": "Get total spend across today, last 7 days, and last 30 days for the entire ad account.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_spend_alert",
        "description": "Check if today's spend has exceeded a threshold. Returns an alert flag and message.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_usd": {
                    "type": "number",
                    "description": "Alert threshold in USD. Uses account default if omitted.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_top_campaigns",
        "description": "Get the top N campaigns ranked by spend (highest spenders first).",
        "input_schema": {
            "type": "object",
            "properties": {
                "date_preset": {
                    "type": "string",
                    "enum": ["today", "yesterday", "last_7d", "last_14d", "last_30d"],
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of campaigns to return. Default: 5.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "list_campaigns",
        "description": "List all campaigns with their ID, name, status, objective, and budget.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by status: ACTIVE, PAUSED, ARCHIVED. Leave empty for all.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "create_campaign",
        "description": (
            "Create a new Meta Ads campaign. Always defaults to PAUSED status for safety — "
            "ask the user to confirm before setting status to ACTIVE."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Campaign name"},
                "objective": {
                    "type": "string",
                    "enum": [
                        "OUTCOME_TRAFFIC",
                        "OUTCOME_AWARENESS",
                        "OUTCOME_ENGAGEMENT",
                        "OUTCOME_LEADS",
                        "OUTCOME_SALES",
                        "OUTCOME_APP_PROMOTION",
                    ],
                    "description": "Campaign objective",
                },
                "daily_budget_usd": {
                    "type": "number",
                    "description": "Daily budget in USD (e.g. 5.00 for $5/day). Default: $5.",
                },
                "status": {
                    "type": "string",
                    "enum": ["ACTIVE", "PAUSED"],
                    "description": "Initial campaign status. Default: PAUSED.",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "create_ad_set",
        "description": "Create an ad set inside a campaign with targeting, budget, and optimization settings.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string", "description": "Campaign ID to add this ad set to"},
                "name": {"type": "string", "description": "Ad set name"},
                "daily_budget_usd": {"type": "number", "description": "Daily budget in USD. Default: $5."},
                "countries": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Target country codes e.g. ['IN', 'US']. Default: ['IN'].",
                },
                "age_min": {"type": "integer", "description": "Minimum target age. Default: 18."},
                "age_max": {"type": "integer", "description": "Maximum target age. Default: 65."},
                "optimization_goal": {
                    "type": "string",
                    "enum": ["LINK_CLICKS", "IMPRESSIONS", "REACH", "LEAD_GENERATION", "CONVERSIONS"],
                    "description": "What Meta should optimize for. Default: LINK_CLICKS.",
                },
            },
            "required": ["campaign_id", "name"],
        },
    },
    {
        "name": "pause_campaign",
        "description": "Pause an active campaign to stop spending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string", "description": "Campaign ID to pause"}
            },
            "required": ["campaign_id"],
        },
    },
    {
        "name": "activate_campaign",
        "description": "Activate / resume a paused campaign to start spending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string", "description": "Campaign ID to activate"}
            },
            "required": ["campaign_id"],
        },
    },
    {
        "name": "update_campaign_budget",
        "description": "Update the daily budget of a campaign.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string", "description": "Campaign ID"},
                "daily_budget_usd": {"type": "number", "description": "New daily budget in USD"},
            },
            "required": ["campaign_id", "daily_budget_usd"],
        },
    },
]

# ─── Tool executor ────────────────────────────────────────────────────────────

def _run_tool(name: str, inputs: dict) -> str:
    try:
        if name == "get_campaign_insights":
            result = reports.get_campaign_insights(inputs.get("date_preset", "last_7d"))
            sheets.log_action(name, str(inputs), f"{len(result)} rows")
            return json.dumps(result, indent=2)

        if name == "get_ad_insights":
            result = reports.get_ad_insights(inputs.get("date_preset", "last_7d"))
            sheets.log_action(name, str(inputs), f"{len(result)} rows")
            return json.dumps(result, indent=2)

        if name == "get_account_spend_summary":
            result = monitor.get_spend_summary()
            sheets.log_action(name, "", str(result))
            return json.dumps(result)

        if name == "check_spend_alert":
            result = monitor.check_spend_alert(inputs.get("threshold"))
            sheets.log_action(name, str(inputs), result["message"])
            return json.dumps(result)

        if name == "get_top_campaigns":
            result = monitor.get_top_campaigns(
                date_preset=inputs.get("date_preset", "last_7d"),
                limit=inputs.get("limit", 5),
            )
            sheets.log_action(name, str(inputs), f"{len(result)} campaigns")
            return json.dumps(result, indent=2)

        if name == "list_campaigns":
            result = campaigns.list_campaigns(inputs.get("status_filter"))
            sheets.log_action(name, str(inputs), f"{len(result)} campaigns")
            return json.dumps(result, indent=2)

        if name == "create_campaign":
            budget_cents = int(float(inputs.get("daily_budget_usd", 5.0)) * 100)
            result = campaigns.create_campaign(
                name=inputs["name"],
                objective=inputs.get("objective", "OUTCOME_TRAFFIC"),
                daily_budget_cents=budget_cents,
                status=inputs.get("status", "PAUSED"),
            )
            sheets.log_action(name, inputs["name"], str(result))
            return json.dumps(result)

        if name == "create_ad_set":
            budget_cents = int(float(inputs.get("daily_budget_usd", 5.0)) * 100)
            targeting = {
                "geo_locations": {"countries": inputs.get("countries", ["IN"])},
                "age_min": inputs.get("age_min", 18),
                "age_max": inputs.get("age_max", 65),
            }
            result = campaigns.create_ad_set(
                campaign_id=inputs["campaign_id"],
                name=inputs["name"],
                daily_budget_cents=budget_cents,
                optimization_goal=inputs.get("optimization_goal", "LINK_CLICKS"),
                targeting=targeting,
            )
            sheets.log_action(name, inputs["name"], str(result))
            return json.dumps(result)

        if name == "pause_campaign":
            result = campaigns.pause_campaign(inputs["campaign_id"])
            sheets.log_action(name, inputs["campaign_id"], "PAUSED")
            return json.dumps(result)

        if name == "activate_campaign":
            result = campaigns.activate_campaign(inputs["campaign_id"])
            sheets.log_action(name, inputs["campaign_id"], "ACTIVE")
            return json.dumps(result)

        if name == "update_campaign_budget":
            budget_cents = int(float(inputs["daily_budget_usd"]) * 100)
            result = campaigns.update_daily_budget(inputs["campaign_id"], budget_cents)
            sheets.log_action(name, str(inputs), str(result))
            return json.dumps(result)

        return json.dumps({"error": f"Unknown tool: {name}"})

    except Exception as e:
        error_msg = str(e)
        sheets.log_action(name, str(inputs), f"ERROR: {error_msg}")
        return json.dumps({"error": error_msg})


# ─── Agent loop ───────────────────────────────────────────────────────────────

SYSTEM_PROMPT = f"""You are the Meta Ads AI agent for {settings.BUSINESS_NAME}.
You manage Facebook and Instagram ad campaigns through the Meta Marketing API.

Your capabilities:
- Performance reports: impressions, clicks, spend, CTR, CPC, reach, frequency
- Spend monitoring: daily summaries and overspend alerts
- Campaign management: list, create, pause, activate, update budgets
- Ad set creation: targeting by country, age, optimization goal

Rules:
- Always create campaigns as PAUSED unless the user explicitly says to launch now
- Before creating or activating anything, confirm the name, budget, and objective
- Format all money as USD with 2 decimal places ($5.00)
- When showing reports, highlight what's performing well and what needs attention
- If spend is near or over threshold, proactively suggest pausing campaigns"""


def run():
    print(f"\nMeta Ads Agent — {settings.BUSINESS_NAME}")
    print("Ask me to pull reports, check spend, create or manage campaigns.")
    print("Type 'quit' to exit.\n")

    conversation: list[dict] = []

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break
        if not user_input:
            continue

        conversation.append({"role": "user", "content": user_input})

        # Agentic loop — keeps running until Claude stops calling tools
        while True:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=conversation,
            )

            conversation.append({"role": "assistant", "content": response.content})

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                for block in response.content:
                    if hasattr(block, "text") and block.text:
                        print(f"\nAgent: {block.text}\n")
                break

            tool_results = []
            for tu in tool_uses:
                print(f"  [{tu.name}]")
                result = _run_tool(tu.name, tu.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result,
                })

            conversation.append({"role": "user", "content": tool_results})


if __name__ == "__main__":
    run()
