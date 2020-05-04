
## Preparation

* [ ] New features are described in `doc/vidjil-algo.md`
* [ ] Breaking changes (or needed) are understood
 
On the `feature-a/release` branch, the last commit is the release commit updating the three following files:
 * [ ] CHANGELOG
 * [ ] `doc/vidjil-algo.md` with the proper release tag
 * [ ] `algo/release` with the proper release tag

## Pipelines

https://gitlab.inria.fr/vidjil/vidjil/pipelines/XXXXX

Usual tests should pass, but also:
* [ ] prepare_release
* [ ] valgrind_unit
* [ ] valgrind_functional
* [ ] multiple_tests

Benchmarks
* [ ] almost no change...
* [ ] ... or significant changes are understood

## Tag and push

* [ ] tag (`git tag release-20XX-XX; git push origin release-20XX-XX`)
* [ ] mirror to GH

## Deploy

* [ ] doc 
* [ ] `app` (vidjil-algo-next)
* [ ] `app` if needed, update server configs
* [ ] `app` notification to users
* [ ] `app` (vidjil-algo)
* [ ] `app` test on production (X5 and L4)
* [ ] `hds` queue for qualification ?
* [ ] twice a year, communicate to users

/label ~cpp

