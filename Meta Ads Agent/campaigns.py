"""Create, list, pause, activate, and update Meta Ads campaigns and ad sets."""
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from meta_ads import init_api

_CAMPAIGN_FIELDS = [
    Campaign.Field.id,
    Campaign.Field.name,
    Campaign.Field.status,
    Campaign.Field.objective,
    Campaign.Field.daily_budget,
    Campaign.Field.lifetime_budget,
    Campaign.Field.start_time,
    Campaign.Field.stop_time,
]

_ADSET_FIELDS = [
    AdSet.Field.id,
    AdSet.Field.name,
    AdSet.Field.status,
    AdSet.Field.campaign_id,
    AdSet.Field.daily_budget,
    AdSet.Field.optimization_goal,
    AdSet.Field.targeting,
]


def list_campaigns(status_filter: list[str] | None = None) -> list[dict]:
    account = init_api()
    params = {}
    if status_filter:
        params["effective_status"] = status_filter
    return [dict(c) for c in account.get_campaigns(fields=_CAMPAIGN_FIELDS, params=params)]


def create_campaign(
    name: str,
    objective: str = "OUTCOME_TRAFFIC",
    daily_budget_cents: int = 500,
    status: str = "PAUSED",
) -> dict:
    account = init_api()
    campaign = account.create_campaign(
        fields=[Campaign.Field.id, Campaign.Field.name],
        params={
            Campaign.Field.name: name,
            Campaign.Field.objective: objective,
            Campaign.Field.status: status,
            Campaign.Field.special_ad_categories: [],
            Campaign.Field.daily_budget: daily_budget_cents,
        },
    )
    return dict(campaign)


def create_ad_set(
    campaign_id: str,
    name: str,
    daily_budget_cents: int = 500,
    optimization_goal: str = "LINK_CLICKS",
    billing_event: str = "IMPRESSIONS",
    targeting: dict | None = None,
    status: str = "PAUSED",
) -> dict:
    account = init_api()
    if targeting is None:
        targeting = {
            "geo_locations": {"countries": ["IN"]},
            "age_min": 18,
            "age_max": 65,
        }
    ad_set = account.create_ad_set(
        fields=[AdSet.Field.id, AdSet.Field.name],
        params={
            AdSet.Field.name: name,
            AdSet.Field.campaign_id: campaign_id,
            AdSet.Field.daily_budget: daily_budget_cents,
            AdSet.Field.optimization_goal: optimization_goal,
            AdSet.Field.billing_event: billing_event,
            AdSet.Field.targeting: targeting,
            AdSet.Field.status: status,
        },
    )
    return dict(ad_set)


def pause_campaign(campaign_id: str) -> dict:
    campaign = Campaign(campaign_id)
    campaign.api_update(fields=[], params={Campaign.Field.status: Campaign.Status.paused})
    return {"id": campaign_id, "status": "PAUSED"}


def activate_campaign(campaign_id: str) -> dict:
    campaign = Campaign(campaign_id)
    campaign.api_update(fields=[], params={Campaign.Field.status: Campaign.Status.active})
    return {"id": campaign_id, "status": "ACTIVE"}


def update_daily_budget(campaign_id: str, daily_budget_cents: int) -> dict:
    campaign = Campaign(campaign_id)
    campaign.api_update(fields=[], params={Campaign.Field.daily_budget: daily_budget_cents})
    return {"id": campaign_id, "daily_budget_cents": daily_budget_cents}
