package il.ac.bgu.cs.bp.bpflow;

import java.io.IOException;
import java.net.URI;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import com.fasterxml.jackson.databind.ObjectMapper;

import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.BThreadSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.SafetyViolationTag;

public class WebSocketRunnerListener extends WebSocketClient implements BProgramRunnerListener {

    private final ObjectMapper objectMapper;

    public WebSocketRunnerListener(URI serverUri) throws InterruptedException {
        super(serverUri);
        this.objectMapper = new ObjectMapper();
        connect();
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        System.out.println("Connected to server");
    }

    @Override
    public void onMessage(String message) {
        // System.out.println("Received message: " + message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        System.out.println("WebSocket connection closed with exit code " + code + " additional info: " + reason);
    }

    @Override
    public void onError(Exception ex) {
        System.err.println("An error occurred:" + ex);
    }

    ///////////////////////////////////////////////////////////////////////////

    @Override
    public void eventSelected(BProgram bp, BEvent theEvent) {
        try {
            String json = objectMapper.writeValueAsString(theEvent);
            send("Event selected: " + json);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void started(BProgram bp) {
        send("Started program: " + bp.getName());
    }

    @Override
    public void ended(BProgram bp) {
        send("Ended program: " + bp.getName());
    }

    @Override
    public void bthreadAdded(BProgram bp, BThreadSyncSnapshot theBThread) {
    }

    @Override
    public void bthreadRemoved(BProgram bp, BThreadSyncSnapshot theBThread) {
    }

    @Override
    public void bthreadDone(BProgram bp, BThreadSyncSnapshot theBThread) {
    }

    @Override
    public void starting(BProgram bprog) {
        send("Starting program: " + bprog.getName());
    }

    @Override
    public void superstepDone(BProgram bp) {
    }

    @Override
    public void assertionFailed(BProgram bp, SafetyViolationTag theFailedAssertion) {
    }

    @Override
    public void halted(BProgram bp) {
    }
}