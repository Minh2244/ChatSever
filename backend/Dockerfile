# Sử dụng JDK 17
FROM eclipse-temurin:17-jdk-alpine

# Tạo thư mục làm việc
WORKDIR /app

# Copy toàn bộ code backend vào container
COPY . .

# Cấp quyền thực thi cho file mvnw (Bước này cực quan trọng để không bị lỗi Permission Denied)
RUN chmod +x mvnw

# Chạy lệnh build Maven để tạo ra file .jar
RUN ./mvnw clean package -DskipTests

# Chạy ứng dụng Java
ENTRYPOINT ["java","-jar","target/backend-0.0.1-SNAPSHOT.jar"]