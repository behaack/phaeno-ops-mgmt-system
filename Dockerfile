# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src/backend

COPY backend/global.json ./global.json
COPY backend/app/PSeq.Operations.Api.csproj app/
COPY backend/modules/PSeq.Operations.Commercial/PSeq.Operations.Commercial.csproj modules/PSeq.Operations.Commercial/
COPY backend/modules/PSeq.Operations.Laboratory/PSeq.Operations.Laboratory.csproj modules/PSeq.Operations.Laboratory/

RUN dotnet restore app/PSeq.Operations.Api.csproj

COPY backend/ ./

RUN dotnet publish app/PSeq.Operations.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.revision="${SOURCE_REVISION}"

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish ./

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "PSeq.Operations.Api.dll"]
