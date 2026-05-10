"""Facebook Ads API initializer — call init_api() to get the AdAccount object."""
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from config import get_settings

settings = get_settings()


def init_api() -> AdAccount:
    FacebookAdsApi.init(
        app_id=settings.META_APP_ID,
        app_secret=settings.META_APP_SECRET,
        access_token=settings.META_ACCESS_TOKEN,
    )
    return AdAccount(settings.META_AD_ACCOUNT_ID)
