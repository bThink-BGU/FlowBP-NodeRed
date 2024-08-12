package il.ac.bgu.cs.bp.bpflow;


import com.google.gson.Gson;

public class RedBPUtils {
    public String stringify(Object obj) {
        return new Gson().toJson(obj);
    }
}
