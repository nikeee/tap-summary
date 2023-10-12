# tap-summary
![Test dashboard: 42 tests passed](https://svg.test-summary.com/dashboard.svg?p=42)
![Test dashboard: 42 tests failed](https://svg.test-summary.com/dashboard.svg?f=42)
![Test dashboard: 42 tests passed, 8 tests failed, 18 tests skipped](https://svg.test-summary.com/dashboard.svg?p=42&f=8&s=18)

Generate GitHub workflow job summaries from your test results. Test results should be present in [TAP format](https://testanything.org). This action is based on the lovely project [test-summary/action](https://github.com/test-summary/action).

## Usage
Automatically pick up all `.tap` files in the project directory:
```yaml
- run: <whatever you need to do to run tests>

- name: Test Summary
  uses: nikeee/tap-summary@v1
  if: always()
```

If you only want to include some TAP files:
```yaml
- name: Test Summary
  uses: nikeee/tap-summary@v1
  with:
    path: "**/*.test.tap" # default: "**/*.tap"
  if: always()
```
