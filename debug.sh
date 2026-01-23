# Tailwind binary version (local)
./node_modules/.bin/tailwindcss -v 2>/dev/null || echo "no local tailwind binary"

# show the CSS you actually edited
printf "\n--- src/style.css ---\n"
cat src/style.css

# show main.ts
printf "\n--- src/main.ts ---\n"
sed -n '1,120p' src/main.ts

# show postcss + tailwind configs
printf "\n--- postcss.config.js ---\n"
sed -n '1,120p' postcss.config.js
printf "\n--- tailwind.config.js ---\n"
sed -n '1,120p' tailwind.config.js