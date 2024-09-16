package il.ac.bgu.cs.bp.bpflow;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

import org.mozilla.javascript.NativeObject;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

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

            if (eventData != null && eventData.containsKey("lib") && "playwright".equals(eventData.get("lib"))) {
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
                } else if (theEvent.name.equals("Fill")) {
                    page.fill(String.valueOf(eventData.get("locator")), String.valueOf(eventData.get("text")));
                } else if (theEvent.name.equals("Navigate")) {
                    page.navigate(String.valueOf(eventData.get("url")));
                } else if (theEvent.name.equals("CloseBrowser")) {
                    page.close();
                } else if (theEvent.name.equals("WaitForTimeout")) {
                    page.waitForTimeout(Integer.parseInt(String.valueOf(eventData.get("timeout"))));
                } else if (theEvent.name.equals("WaitForSelector")) {
                    page.waitForSelector(String.valueOf(eventData.get("selector")));
                } else if (theEvent.name.equals("Screenshot")) {
                    Path screenshotPath = Paths.get(String.valueOf(eventData.get("path")));
                    page.screenshot(new Page.ScreenshotOptions().setPath(screenshotPath));
                } else if (theEvent.name.equals("SelectOption")) {
                    page.selectOption(String.valueOf(eventData.get("locator")), String.valueOf(eventData.get("value")));
                } else if (theEvent.name.equals("Check")) {
                    page.check(String.valueOf(eventData.get("locator")));
                } else if (theEvent.name.equals("Uncheck")) {
                    page.uncheck(String.valueOf(eventData.get("locator")));
                } else if (theEvent.name.equals("KeyboardPress")) {
                    page.press(String.valueOf(eventData.get("locator")), String.valueOf(eventData.get("key")));
                } else if (theEvent.name.equals("KeyboardUp")) {
                    page.keyboard().up(String.valueOf(eventData.get("key")));
                } else if (theEvent.name.equals("Type")) {
                    page.type(String.valueOf(eventData.get("locator")), String.valueOf(eventData.get("text")));
                } else if (theEvent.name.equals("KeyboardDown")) {
                    page.keyboard().down(String.valueOf(eventData.get("key")));
                } else if (theEvent.name.equals("AssertNotOnPage")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).hasCount(0);
                } else if (theEvent.name.equals("AssertIsDisabled")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).isDisabled();
                }
                else if (theEvent.name.equals("AssertIsEnabled")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).isEnabled();
                } else if (theEvent.name.equals("AssertIsChecked")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).isChecked();
                } else if (theEvent.name.equals("AssertIsNotChecked")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).not().isChecked();
                } else if (theEvent.name.equals("AssertIsVisible")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).isVisible();
                } else if (theEvent.name.equals("AssertIsNotVisible")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).not().isVisible();
                } else if (theEvent.name.equals("AssertText")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    String text = String.valueOf(eventData.get("text"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).hasText(text);
                } else if (theEvent.name.equals("AssertValue")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    String value = String.valueOf(eventData.get("value"));
                    PlaywrightAssertions.assertThat(page.locator(locator)).hasValue(value);
                } else if (theEvent.name.equals("AssertTitle")) {
                    String title = String.valueOf(eventData.get("title"));
                    PlaywrightAssertions.assertThat(page).hasTitle(title);
                } else if (theEvent.name.equals("AssertUrl")) {
                    String url = String.valueOf(eventData.get("url"));
                    PlaywrightAssertions.assertThat(page).hasURL(url);
                } else if (theEvent.name.equals("AssertCount")) {
                    String locator = String.valueOf(eventData.get("locator"));
                    int count = Integer.parseInt(String.valueOf(eventData.get("count")));
                    PlaywrightAssertions.assertThat(page.locator(locator)).hasCount(count);
                } 
            }
        } catch (ClassCastException ignored) {
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