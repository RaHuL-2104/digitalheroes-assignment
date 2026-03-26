param(
  [Parameter(Mandatory = $true)][string]$SupabaseUrl,
  [Parameter(Mandatory = $true)][string]$SupabaseAnonKey,
  [Parameter(Mandatory = $true)][string]$SupabaseServiceRoleKey,
  [Parameter(Mandatory = $true)][string]$StripeSecretKey,
  [Parameter(Mandatory = $true)][string]$StripeWebhookSecret,
  [Parameter(Mandatory = $true)][string]$StripePriceMonthly,
  [Parameter(Mandatory = $true)][string]$StripePriceYearly,
  [Parameter(Mandatory = $true)][string]$AppUrl,
  [Parameter(Mandatory = $true)][string]$CronSecret
)

$envMap = @{
  NEXT_PUBLIC_SUPABASE_URL = $SupabaseUrl
  NEXT_PUBLIC_SUPABASE_ANON_KEY = $SupabaseAnonKey
  SUPABASE_SERVICE_ROLE_KEY = $SupabaseServiceRoleKey
  STRIPE_SECRET_KEY = $StripeSecretKey
  STRIPE_WEBHOOK_SECRET = $StripeWebhookSecret
  STRIPE_PRICE_MONTHLY = $StripePriceMonthly
  STRIPE_PRICE_YEARLY = $StripePriceYearly
  APP_URL = $AppUrl
  CRON_SECRET = $CronSecret
}

foreach ($key in $envMap.Keys) {
  $value = $envMap[$key]
  $value | npx.cmd vercel env add $key production
}

Write-Host "Production env push complete."
