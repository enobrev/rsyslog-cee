import babel from 'rollup-plugin-babel';

export default {
    entry:   'src/index.js',
    output:  {
        file:   'dist/index.js',
        format: 'cjs'
    },
    plugins: [
        babel()
    ]
};
