# Sử dụng Maven có sẵn để build, không dùng file mvnw của project nữa
FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app

# Copy toàn bộ code backend vào
COPY . .

# Build bằng lệnh mvn của hệ thống
RUN mvn clean package -DskipTests

# Chạy ứng dụng
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]