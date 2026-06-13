# OpenPencil System Skills

This folder contains the system skills used by the OpenPencil Design extension.

- `pen-ai-skills/`: canonical source for the Markdown files previously stored inside `Modificacoes/Design/vendor/openpencil/packages/pen-ai-skills/skills`.

The OpenPencil `vite-plugin-skills.ts` resolver finds this folder by walking up from the package path. When installed into a Theia target, this subtree is copied to `<target>/Skills/System/OpenPencil`.

The resolver still supports the legacy package-local `skills/` folder as a fallback.
