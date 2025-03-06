const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const buildOptions = {
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        platform: 'node',
        external: ['vscode'],
        resolveExtensions: ['.ts', '.js'], // Risolvi estensioni .ts e .js
        mainFields: ['module', 'main'], // Usa "module" per ESM, altrimenti "main" per CJS
        outdir: 'dist',
        logLevel: 'info',
        plugins: [
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin
        ]
    };

    if (watch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Build completed in Watch mode');
    } else {
        await esbuild.build(buildOptions);

        if (production) {
            console.log('Build completed in Production mode');
        }
        else {
            console.log('Build completed in Debugging mode');
        }
    }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd(result => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                if (location === null) { return; }
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    }
};

main().catch(e => {
    console.error(e);
    process.exit(1);
});
