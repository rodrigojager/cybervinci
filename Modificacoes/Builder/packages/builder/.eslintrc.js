/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        '../../configs/build.eslintrc.json'
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
    },
    rules: {
        '@typescript-eslint/tslint/config': 'off',
        'max-len': 'off',
        'no-null/no-null': 'off'
    }
};
