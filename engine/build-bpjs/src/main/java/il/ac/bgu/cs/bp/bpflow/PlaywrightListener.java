package il.ac.bgu.cs.bp.bpflow;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.mozilla.javascript.NativeObject;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;

import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.BThreadSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.SafetyViolationTag;

public class PlaywrightListener implements BProgramRunnerListener {

    private Browser browser;
    private BrowserContext context;

    Map<String, Page> pages = new HashMap<String, Page>();

    @Override
    public void eventSelected(BProgram bp, BEvent theEvent) {
        try {
            var eventData = (NativeObject) theEvent.getData();

            if (eventData != null && eventData.containsKey("lib") && eventData.get("lib").equals("playwright")) {
                System.err.println("Playwright event: " + theEvent);

                Page page = null;
                if (eventData.get("page") != null) {
                    page = pages.get(eventData.get("page"));
                }

                if (theEvent.name.equals("StartBrowser")) {
                    page = openBrowser(String.valueOf(eventData.get("url")));
                    pages.put(String.valueOf(eventData.get("page")), page);
                } else if (theEvent.name.equals("Click")) {
                    page.click(String.valueOf(eventData.get("locator")));
                } else if (theEvent.name.equals("Type")) {
                    page.type(String.valueOf(eventData.get("locator")), String.valueOf(eventData.get("text")));
                } else if (theEvent.name.equals("KeyboardDown")) {
                    page.keyboard().down(String.valueOf(eventData.get("key")));                
                    // } else if (theEvent.name.equals("WaitForSelector")) {
                    // page.waitForSelector(String.valueOf(eventData.get("selector")));
                    // } else if (theEvent.name.equals("WaitForTimeout")) {
                    // page.waitForTimeout(Integer.parseInt(String.valueOf(eventData.get("timeout"))));
                    // } else if (theEvent.name.equals("Screenshot")) {
                    // page.screenshot(
                    // new
                    // Page.ScreenshotOptions().setPath(Paths.get(String.valueOf(eventData.get("path")))));
                }

            }
        } catch (ClassCastException e) {
        }
    }

    private Page openBrowser(String url) {
        System.out.println("Openning browser at: " + url);
        Playwright playwright = Playwright.create();
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(false));
        context = browser.newContext();
        var page = context.newPage();
        page.navigate(url);
        return page;
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