module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:fxa/client'
  ],
  plugins: [
    'fxa'
  ],
  root: true,
  rules: {
    'prefer-const': 'warn',
    'strict': 'off',
    'valid-jsdoc': ['warn', {requireParamDescription: false, requireReturnDescription: false}]
  }
};
