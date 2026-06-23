FROM node:20-slim

# Install Python for SymPy verifier
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install Python dependencies
COPY tools/sympy_verifier/requirements.txt ./tools/sympy_verifier/requirements.txt
RUN pip3 install --no-cache-dir -r tools/sympy_verifier/requirements.txt

# Copy source
COPY . .

# Verify installation
RUN npm run typecheck && npm test

# Default: run core benchmarks
CMD ["npm", "run", "reproduce:core"]
