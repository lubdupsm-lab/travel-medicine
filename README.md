# Travel Medicine Reference Map

Static site for **Travel Medicine Reference Map — Dr. Zeyad Halawani**. The page is the supplied `index.html` with its medical text and interface unchanged. Scripts, styles, and map data are inline. The only external request is the Google Fonts stylesheet.

The live site is already publishing `main`: [https://lubdupsm-lab.github.io/travel-medicine/](https://lubdupsm-lab.github.io/travel-medicine/). Review branches are not the live site until they are merged.

## Publish with GitHub Pages

Pages is already set to deploy from `main` at `/`. Do not point Pages at an unmerged branch.

1. Merge the pull request into `main`.
2. Open **Settings → Pages** for [lubdupsm-lab/travel-medicine](https://github.com/lubdupsm-lab/travel-medicine).
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to `main` and the folder to **`/ (root)`**, then save.

GitHub will publish `index.html` at `/travel-medicine/`. `.nojekyll` is included so Pages serves the file as static HTML and does not run Jekyll. No custom domain is configured.

The same setting can be applied with the Pages REST API by an admin after the merge (`POST /repos/lubdupsm-lab/travel-medicine/pages` with source branch `main` and path `/`). This agent’s credentials cannot change repository settings.
