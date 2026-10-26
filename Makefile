.PHONY: install dev test typecheck lint build app ffmpeg icon mas web web-dev

DESKTOP := apps/desktop

install:
	npm install
	cd $(DESKTOP) && npx install-electron

dev:
	npm run dev:desktop

test: ffmpeg
	npm test --workspaces

typecheck:
	npm run typecheck --workspaces

lint:
	npm run lint

build:
	cd $(DESKTOP) && npm run build

icon:
	$(DESKTOP)/scripts/build-icon.sh

ffmpeg: $(DESKTOP)/resources/ffmpeg/ffmpeg

$(DESKTOP)/resources/ffmpeg/ffmpeg:
	$(DESKTOP)/scripts/build-ffmpeg.sh

app: ffmpeg
	cd $(DESKTOP) && npm run app
	rm -rf "/Applications/Cuts.app"
	cp -R "$(DESKTOP)/dist/mac-universal/Cuts.app" /Applications/

mas: ffmpeg
	@test -n "$(APPLE_TEAM_ID)" || (echo "Set APPLE_TEAM_ID (Apple Developer > Membership)" && exit 1)
	@test -f $(DESKTOP)/build/embedded.provisionprofile || (echo "Download the Mac App Store provisioning profile to $(DESKTOP)/build/embedded.provisionprofile" && exit 1)
	sed "s/APPLE_TEAM_ID/$(APPLE_TEAM_ID)/" $(DESKTOP)/build/entitlements.mas.template.plist > $(DESKTOP)/build/entitlements.mas.plist
	cd $(DESKTOP) && npx electron-vite build
	cd $(DESKTOP) && npx electron-builder --mac mas --universal

web:
	cd apps/web && npm ci && npm test && npm run build

web-dev:
	npm run dev:web
