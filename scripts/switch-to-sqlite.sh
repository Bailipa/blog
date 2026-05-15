#!/bin/bash
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
echo "Switched to SQLite."
