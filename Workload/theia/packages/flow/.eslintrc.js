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
        '@theia/localization-check': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-shadow': 'off',
        '@typescript-eslint/quotes': 'off',
        '@typescript-eslint/tslint/config': 'off',
        'max-len': 'off',
        'no-null/no-null': 'off',
        'no-void': 'off'
    }
};
