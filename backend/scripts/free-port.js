const { execSync } = require("child_process");

const port = process.env.PORT || 3000;

function freePortWindows() {
  const output = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
  const pids = new Set();

  for (const line of output.split("\n")) {
    const match = line.match(/^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
    if (match && Number(match[1]) === Number(port)) {
      pids.add(match[2]);
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`[free-port] Killed process ${pid} holding port ${port}`);
    } catch (error) {
      // Process may have already exited; nothing to do.
    }
  }
}

function freePortUnix() {
  let pids;
  try {
    pids = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
  } catch (error) {
    return; // Nothing listening on the port.
  }

  for (const pid of pids.split("\n").filter(Boolean)) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      console.log(`[free-port] Killed process ${pid} holding port ${port}`);
    } catch (error) {
      // Process may have already exited; nothing to do.
    }
  }
}

try {
  if (process.platform === "win32") {
    freePortWindows();
  } else {
    freePortUnix();
  }
} catch (error) {
  // Best-effort cleanup only — never block `npm run dev` from starting.
}
