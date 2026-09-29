#!/usr/bin/env ruby
# asc_latest_build — print the highest build number (CFBundleVersion) ever
# uploaded to App Store Connect for an app, across every marketing version.
#
#   ruby scripts/asc_latest_build.rb <key_id> <issuer_id> <p8_path> <bundle_id>
#
# TestFlight dev uploads consume a build number without creating a release
# tag, so App Store Connect is the second ledger that
# scripts/check-build-number.mjs compares against (via --asc-max). Unlike the
# notes script, every failure here is fatal: publishing must not proceed on an
# unknown ledger. Prints 0 when the app has no builds yet.

require_relative 'asc_whats_to_test'

PAGE_LIMIT = 200

# Walks every page returned by `fetch_page` (path -> parsed JSON) and returns
# the highest purely numeric build version. Non-numeric versions are ignored.
def highest_uploaded_build(app_id, fetch_page)
  path = "/v1/builds?filter[app]=#{app_id}&fields[builds]=version&limit=#{PAGE_LIMIT}"
  highest = 0
  while path
    page = fetch_page.call(path)
    (page['data'] || []).each do |build|
      version = build.dig('attributes', 'version').to_s
      highest = [highest, version.to_i].max if version.match?(/\A\d+\z/)
    end
    next_url = page.dig('links', 'next')
    path = next_url && next_url.sub(API, '')
  end
  highest
end

def fetch_json!(token, path)
  code, body = request(token, 'GET', path)
  abort "error: GET #{path} -> HTTP #{code}: #{body}" unless code.between?(200, 299)
  JSON.parse(body)
end

def latest_build_main(argv = ARGV)
  key_id, issuer_id, p8_path, bundle_id = argv
  unless key_id && issuer_id && p8_path && bundle_id
    abort 'usage: asc_latest_build.rb <key_id> <issuer_id> <p8_path> <bundle_id>'
  end

  token = jwt(key_id, issuer_id, p8_path)
  apps = fetch_json!(
    token,
    "/v1/apps?filter[bundleId]=#{URI.encode_www_form_component(bundle_id)}&limit=1"
  )
  app_id = apps.dig('data', 0, 'id')
  abort "error: no App Store Connect app for bundle id #{bundle_id}" unless app_id

  puts highest_uploaded_build(app_id, ->(path) { fetch_json!(token, path) })
end

latest_build_main if $PROGRAM_NAME == __FILE__
