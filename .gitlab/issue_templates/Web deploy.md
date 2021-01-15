

### Before the deploy

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
- [ ] Finalize `CHANGELOG.web`
- [ ] Finalize ~doc
- [ ] Finalize `docker/CHANGELOG`

Tuesday XX (D-1)
- [ ] MR Freeze (everything)

### Deploy day

Wednesday XX (D0)
- [ ] Morning: update notification on the server
- [ ] MR `feature-cs/release` to `prod-client` !XXX and `prod-server` !XXX
- [ ] Disconnect the client through `conf.js`
- [ ] Deploy 
- [ ] Live test on the prod server
- [ ] Reconnect the client
- [ ] Notification "Maintenance finished" + news
- [ ] Possibly mail to users
- [ ] Merge `feature-cs/release` into `dev` and `master`, and `git push github`


