.PHONY: install dev test typecheck build app ffmpeg icon mas web web-dev

install:
	npm install
	npx install-electron

dev:
	npm run dev

test: ffmpeg
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

icon:
	./scripts/build-icon.sh

ffmpeg: resources/ffmpeg/ffmpeg

resources/ffmpeg/ffmpeg:
	./scripts/build-ffmpeg.sh

app: ffmpeg
	npm run app
	rm -rf "/Applications/Cuts.app"
	cp -R "dist/mac-universal/Cuts.app" /Applications/

mas: ffmpeg
	@test -n "$(APPLE_TEAM_ID)" || (echo "Set APPLE_TEAM_ID (Apple Developer > Membership)" && exit 1)
	@test -f build/embedded.provisionprofile || (echo "Download the Mac App Store provisioning profile to build/embedded.provisionprofile" && exit 1)
	sed "s/APPLE_TEAM_ID/$(APPLE_TEAM_ID)/" build/entitlements.mas.template.plist > build/entitlements.mas.plist
	npx electron-vite build
	npx electron-builder --mac mas --universal

web:
	cd apps/web && npm ci && npm test && npm run build

web-dev:
	cd apps/web && npm run dev
