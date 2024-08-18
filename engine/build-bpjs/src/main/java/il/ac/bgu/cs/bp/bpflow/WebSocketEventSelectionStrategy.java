package il.ac.bgu.cs.bp.bpflow;

import static java.util.stream.Collectors.toSet;

import java.io.IOException;
import java.net.URI;
import java.util.Optional;
import java.util.Set;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import com.fasterxml.jackson.databind.ObjectMapper;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgramSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.EventSelectionResult;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.EventSelectionStrategy;

public class WebSocketEventSelectionStrategy extends WebSocketClient implements EventSelectionStrategy {

    private final EventSelectionStrategy decoratedStrategy;
    private final ObjectMapper objectMapper;

    public WebSocketEventSelectionStrategy(URI serverUri, EventSelectionStrategy decoratedStrategy) {
        super(serverUri);
        this.decoratedStrategy = decoratedStrategy;
        this.objectMapper = new ObjectMapper();
        connect();
    }

    @Override
    public void onError(Exception ex) {
        System.err.println("An error occurred:" + ex);
    }

    @Override
    public Set<BEvent> selectableEvents(BProgramSyncSnapshot bpss) {
        return decoratedStrategy.selectableEvents(bpss);
    }

    @Override
    public Optional<EventSelectionResult> select(BProgramSyncSnapshot bpss, Set<BEvent> selectableEvents) {
        try {
            String json = objectMapper.writeValueAsString(selectableEvents);
            send("Selectable events:" + json);
        } catch (IOException e) {
            e.printStackTrace();
        }

        // Delegate to the decorated strategy
        Optional<EventSelectionResult> result = decoratedStrategy.select(bpss, selectableEvents);

        // Custom behavior after delegating to the decorated strategy
        System.out.println("Selected event: " + result.get().getEvent());

        return result;
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        System.out.println("WebSocket connection opened");
    }

    @Override
    public void onMessage(String message) {
        //System.out.println("Received message: " + message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        System.out.println("WebSocket connection closed with exit code " + code + " additional info: " + reason);
    }
}