### Before the deploy <!-- markdownlint-disable-line first-line-h1 -->

- [ ] Set the deploy day (Most servers are busy on Mondays and Tuesdays. Web deploys are usually done on Wednesday.)
- [ ] Before the MR freeze, discuss regularly in the team what remains to do

Tuesday XX (D-8)

- [ ] Notification on the server
- [ ] MR Freeze (everything except urgent fixes or bikeshed strings/~doc)
- [ ] Move issues/MR that are still opened to a new milestone for the next release
- [ ] Push on `feature-cs/release`

### Deploy week

- [ ] Deploy on `dev`, either with `git pull` or with Docker
- [ ] Live tests on `dev`

On `feature-cs/release`:

- [ ] Bikeshed strings
- [ ] List all the changes, checking that the milestone contains all relevant issues/MR
- [ ] Finalize `changelog-web`
- [ ] Finalize ~doc
- [ ] Finalize `changelog-docker`

Tuesday XX (D-1)

- [ ] MR Freeze (everything)

### Deploy day

Wednesday XX (D0)

- [ ] Morning: update notification on the server
- [ ] MR `feature-cs/release` to `prod-client` !XXX and `prod-server` !XXX
- [ ] Tag `feature-cs/release` as `web-20XX.YY.Z` with YY being the month and Z being the number of the hotfix (e.g. `web-2025.06.1` for first version of June 2025, and `web-2025.06.2` for the first hotfix of this version) - NB: do not forget to push the tag to GitLab
- [ ] Disconnect the client through `conf.js`
- [ ] Deploy --> see [documentation on updating](https://www.vidjil.org/doc/server/#updating-a-docker-installation) and network.md file in vdj for specific instructions
- [ ] Deploy doc
- [ ] Deploy tutorial if needed
- [ ] Link vidjil-algo to latest if needed
- [ ] Live test on the prod server
- [ ] Reconnect the client
- [ ] Notification "Maintenance finished" + news
- [ ] Possibly mail to users
- [ ] Merge `feature-cs/release` into `dev` and `master`, and `git push github`
