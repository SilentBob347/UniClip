#!/usr/bin/env ruby

require 'minitest/autorun'
require_relative 'asc_latest_build'

class AscLatestBuildTest < Minitest::Test
  def build(version)
    { 'attributes' => { 'version' => version } }
  end

  def test_returns_the_highest_numeric_build_across_pages
    pages = {
      '/v1/builds?filter[app]=app-1&fields[builds]=version&limit=200' => {
        'data' => [build('186'), build('9')],
        'links' => { 'next' => "#{API}/v1/builds?cursor=2" }
      },
      '/v1/builds?cursor=2' => { 'data' => [build('188'), build('1.0')], 'links' => {} }
    }
    requested = []

    highest = highest_uploaded_build('app-1', lambda do |path|
      requested << path
      pages.fetch(path)
    end)

    assert_equal 188, highest
    assert_equal pages.keys, requested
  end

  def test_returns_zero_for_an_app_without_builds
    assert_equal 0, highest_uploaded_build('app-1', ->(_path) { { 'data' => [] } })
  end
end
