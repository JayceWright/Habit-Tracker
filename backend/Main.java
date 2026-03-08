import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.io.OutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;

public class Main {
    // Твоя новая "база данных"
    private static final Path DB_FILE = Paths.get("database.json");

    public static void main(String[] args) throws Exception {
        // Если файла нет при запуске — создаем его с дефолтной таской
        if (!Files.exists(DB_FILE)) {
            String initData = "[{\"id\": 1, \"name\": \"Перестать писать говнокод\", \"done\": false}]";
            Files.writeString(DB_FILE, initData);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/habits", exchange -> {
            
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("GET".equals(exchange.getRequestMethod())) {
                // Читаем напрямую с жесткого диска
                String response = Files.readString(DB_FILE);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                byte[] bytes = response.getBytes("UTF-8");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } else if ("POST".equals(exchange.getRequestMethod())) {
                InputStream is = exchange.getRequestBody();
                String body = new String(is.readAllBytes(), "UTF-8");
                
                String name = "Безымянная привычка";
                if (body.contains("\"name\"")) {
                    name = body.split("\"name\"\\s*:\\s*\"")[1].split("\"")[0];
                }
                
                // Генерим уникальный ID на основе времени (костыль, но для тебя сойдет)
                long id = System.currentTimeMillis();
                
                // Читаем старый файл, отрезаем последнюю скобку ']' и приклеиваем новый JSON
                String oldData = Files.readString(DB_FILE).trim();
                if (oldData.endsWith("]")) {
                    oldData = oldData.substring(0, oldData.length() - 1);
                }
                
                String prefix = oldData.length() > 1 ? "," : "";
                String newHabit = String.format("%s{\"id\": %d, \"name\": \"%s\", \"done\": false}]", prefix, id, name);
                
                // Записываем обновленную строку обратно на диск
                Files.writeString(DB_FILE, oldData + newHabit);

                exchange.sendResponseHeaders(201, -1);
            } else {
                exchange.sendResponseHeaders(405, -1);
            }
        });
        server.setExecutor(null);
        server.start();
        System.out.println("Сервер с ФАЙЛОВОЙ БАЗОЙ запущен на 8080. Данные теперь бессмертны.");
    }
}