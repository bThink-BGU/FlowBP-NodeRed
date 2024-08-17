package il.ac.bgu.cs.bp.bpflow;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.BThreadSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.SafetyViolationTag;

import java.net.URI;

public class WebSocketRunnerListener extends WebSocketClient implements BProgramRunnerListener {

    public WebSocketRunnerListener(URI serverUri) throws InterruptedException {
        super(serverUri);
        connect();
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        //System.out.println("Connected to server");
    }

    @Override
    public void onMessage(String message) {
        //System.out.println("Received message: " + message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        //System.out.println("Connection closed: " + reason);
    }

    @Override
    public void onError(Exception ex) {
        //ex.printStackTrace();
        System.out.println("Disconnected: " + ex.getMessage());
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public void send(String message) {
        if (isOpen())
            super.send(message);
    }
    
    @Override
    public void starting(BProgram bprog) {
        send("Starting program: " + bprog.getName());
    }

    @Override
    public void started(BProgram bp) {
        send("Started program: " + bp.getName());
    }

    @Override
    public void superstepDone(BProgram bp) {
        send("Superstep done: " + bp.getName());
    }

    @Override
    public void ended(BProgram bp) {
        send("Ended program: " + bp.getName());
    }

    @Override
    public void assertionFailed(BProgram bp, SafetyViolationTag theFailedAssertion) {
        send("Assertion failed: " + theFailedAssertion);
    }

    @Override
    public void bthreadAdded(BProgram bp, BThreadSyncSnapshot theBThread) {
        send("Added b-thread: " + theBThread.getName());
    }

    @Override
    public void bthreadRemoved(BProgram bp, BThreadSyncSnapshot theBThread) {
        send("Removed b-thread: " + theBThread.getName());
    }

    @Override
    public void bthreadDone(BProgram bp, BThreadSyncSnapshot theBThread) {
        send("B-thread done: " + theBThread.getName());
    }

    @Override
    public void eventSelected(BProgram bp, BEvent theEvent) {
        send("Event selected: " + theEvent);
    }

    @Override
    public void halted(BProgram bp) {
        send("Halted program: " + bp.getName());
    }
}
