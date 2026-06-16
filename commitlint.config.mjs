export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style', 'perf'],
    ],
    'scope-enum': [
      2,
      'always',
      ['ui', 'api', 'shared', 'deps', 'config', 'ci'],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
  },
}
