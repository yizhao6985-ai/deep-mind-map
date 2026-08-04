const { version } = require('./package.json')

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    name: 'Deep Mind Map',
    executableName: 'Deep Mind Map',
    appBundleId: 'com.deepmindmap.app',
    appCategoryType: 'public.app-category.productivity',
    icon: './build/icon',
    asar: true,
    // Forge owns `out/`; electron-vite builds into `dist/`.
    ignore: [
      /^\/src($|\/)/,
      /^\/electron($|\/)/,
      /^\/docs($|\/)/,
      /^\/\.git($|\/)/,
      /^\/\.github($|\/)/,
      /^\/\.vscode($|\/)/,
      /^\/out($|\/)/,
      /^\/release($|\/)/,
      /^\/coverage($|\/)/,
      /electron\.vite\.config\./,
      /forge\.config\./,
      /vitest\.config\./,
      /tsconfig(\..*)?\.json$/,
      /\.md$/,
      /\.map$/,
      /^\.DS_Store$/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      // Include version + arch so dual-arch makes don't collide and filenames are clear.
      config: (arch) => ({
        name: `Deep Mind Map-${version}-${arch}`,
        overwrite: true
      })
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'DeepMindMap',
        setupIcon: './build/icon.ico'
      }
    }
  ]
}
