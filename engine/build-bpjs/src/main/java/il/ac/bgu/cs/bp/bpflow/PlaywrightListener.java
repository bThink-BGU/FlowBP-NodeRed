package il.ac.bgu.cs.bp.bpflow;

import org.mozilla.javascript.NativeObject;

import com.microsoft.playwright.*;

import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.BThreadSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.SafetyViolationTag;

public class PlaywrightListener implements BProgramRunnerListener {

    private Browser browser;
    private BrowserContext context;
    private Page page;

    @Override
    public void eventSelected(BProgram bp, BEvent theEvent) {
        try {
            var eventData = (NativeObject) theEvent.getData();

            if (eventData != null && eventData.containsKey("lib") && eventData.get("lib").equals("playwright")) {
                System.err.println("Playwright event: " + theEvent.name);

                if (theEvent.name.equals("StartBrowser")) {
                    openBrowser(String.valueOf(eventData.get("url")));
                }
            }
        } catch (ClassCastException e) {
        }
    }

    private void openBrowser(String url) {
        System.out.println("Openning browser at: " + url);
        Playwright playwright = Playwright.create();
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(false));
        context = browser.newContext();
        page = context.newPage();
        page.navigate(url);
    }

    // Ensure to close the browser when done
    public void closeBrowser() {
        if (browser != null) {
            browser.close();
            System.out.println("Browser closed");
        }
    }

    @Override
    public void starting(BProgram bprog) {
    }

    @Override
    public void started(BProgram bp) {
    }

    @Override
    public void superstepDone(BProgram bp) {
    }

    @Override
    public void ended(BProgram bp) {
    }

    @Override
    public void assertionFailed(BProgram bp, SafetyViolationTag theFailedAssertion) {
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
    public void halted(BProgram bp) {
    }
}