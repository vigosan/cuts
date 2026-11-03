Pod::Spec.new do |s|
  s.name           = 'CutsMedia'
  s.version        = '1.0.0'
  s.summary        = 'Audio peaks, thumbnails, export and Photos access for Cuts'
  s.author         = 'Vicent Gozalbes'
  s.homepage       = 'https://github.com/vigosan'
  s.platforms      = { :ios => '18.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '6.0'
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '*.swift', 'CutsMedia/Sources/CutsMedia/*.swift'
end
