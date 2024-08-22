package il.ac.bgu.cs.bp.bpflow;

import org.java_websocket.server.WebSocketServer;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;

import java.net.InetSocketAddress;
import java.util.HashSet;
import java.util.Set;

public class ConnectionServer extends WebSocketServer {

    Set<WebSocket> connections = new HashSet<>();

    public ConnectionServer(InetSocketAddress address) {
        super(address);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("New connection: " + conn.getRemoteSocketAddress());

        // Add the new client to the list of connected clients
        connections.add(conn);

        // Optionally send a welcome message to the new client
        conn.send("Welcome to the WebSocket server!");

        broadcast("New connection: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("Closed connection: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        // System.out.println("Message received: " + message);

        // Broadcast the received message to all connected clients
        broadcast(message);

    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("Server started successfully");
    }

    public void broadcast(String message) {
        for (WebSocket client : connections) {
            if (client.isOpen()) {
                client.send(message);
            }
        }
    }

    public static void main(String[] args) {
        WebSocketServer server = new ConnectionServer(new InetSocketAddress(8085));
        server.start();
    }
}
