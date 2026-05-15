#!/bin/bash
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "Switched to PostgreSQL."
