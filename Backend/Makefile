ENTRYPOINT=./cmd/server/main.go
SERVICE_NAME=server
GO_VERSION=1.26.0

.PHONY: lint
lint:
	golangci-lint run

.PHONY: build
build: tidy
	CGO_ENABLED=0 go build -o ./bin/${SERVICE_NAME} ${ENTRYPOINT}

.PHONY: tidy
tidy:
	@go mod tidy -go ${GO_VERSION}

.PHONY: run
run:
	go run -race cmd/server/main.go
