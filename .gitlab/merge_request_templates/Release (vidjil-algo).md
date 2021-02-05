
## Before the release

### Documentation

* [ ] New features are described in `doc/vidjil-algo.md`
* [ ] Breaking changes (and needed configuration changes) are understood
 
On the `feature-a/release` branch, the last commit is the release commit updating the three following files:
 * [ ] CHANGELOG
 * [ ] `doc/vidjil-algo.md` with the proper release tag
 * [ ] `algo/release` with the proper release tag

### Pipelines

https://gitlab.inria.fr/vidjil/vidjil/pipelines/XXXXX
(if tests passed on different pipelines, indicate below the relevant pipelines)

Usual tests should pass, but also:
* [ ] prepare_release
* [ ] valgrind_unit
* [ ] valgrind_functional
* [ ] multiple_tests

Benchmarks
* [ ] almost no change...
* [ ] ... or significant changes are understood

Profiling
* cpu: PointerACAutomaton.getResults, ~37% ?
* mem: PointerACAutomaton.insert, ~73% ?
* [ ] almost no change...
* [ ] ... or significant changes are understood

## The release, publish, tag and push

* [ ] merge this MR to *master* and tag: `git tag release-20XX-XX` 
* [ ] push: `git push origin master release-20XX-XX`
* [ ] mirror to GH: `git push github master release-20XX.XX`
* [ ] deploy to vidjil.org/releases and app.vidjil.org: click on `copy_release` (there may be changes to CD...)
* [ ] deploy the doc: click on `deploy_doc`


After these steps, we merge back the release in `dev`:
* [ ] merge this MR to dev

## After the release: deploy

* [ ] Click `deploy_release_prod` in the `deploy_prod` stage, deploying the release on `vidjil-algo-next` on the public server
* [ ] Open a new internal issue with the `Deploy (vidjil-algo)` template : vdj#XXXXX

* [ ] Possibly fix things in `merge_request_templates/Release (vidjil-algo).md` on a new MR

/label ~cpp

