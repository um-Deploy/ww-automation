"""Pull performance insights from Meta Ads at account, campaign, adset, and ad level."""
from facebook_business.adobjects.adsinsights import AdsInsights
from meta_ads import init_api

_FIELDS = [
    AdsInsights.Field.campaign_id,
    AdsInsights.Field.campaign_name,
    AdsInsights.Field.adset_id,
    AdsInsights.Field.adset_name,
    AdsInsights.Field.ad_id,
    AdsInsights.Field.ad_name,
    AdsInsights.Field.impressions,
    AdsInsights.Field.clicks,
    AdsInsights.Field.spend,
    AdsInsights.Field.ctr,
    AdsInsights.Field.cpc,
    AdsInsights.Field.reach,
    AdsInsights.Field.frequency,
    AdsInsights.Field.actions,
    AdsInsights.Field.cost_per_action_type,
]


def _fetch(level: str, date_preset: str) -> list[dict]:
    account = init_api()
    insights = account.get_insights(
        fields=_FIELDS,
        params={"date_preset": date_preset, "level": level},
    )
    return [dict(row) for row in insights]


def get_account_insights(date_preset: str = "last_7d") -> list[dict]:
    return _fetch("account", date_preset)


def get_campaign_insights(date_preset: str = "last_7d") -> list[dict]:
    return _fetch("campaign", date_preset)


def get_adset_insights(date_preset: str = "last_7d") -> list[dict]:
    return _fetch("adset", date_preset)


def get_ad_insights(date_preset: str = "last_7d") -> list[dict]:
    return _fetch("ad", date_preset)
