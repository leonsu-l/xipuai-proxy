function createSseParser(onEvent) {
    let buffer = "";

    return {
        push(chunk) {
            buffer += chunk;

            while (true) {
                const idx = buffer.indexOf("\n\n");
                if (idx === -1) {
                    break;
                }

                const rawEvent = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);

                const lines = rawEvent.split(/\r?\n/);
                const dataLines = [];
                for (const line of lines) {
                    if (line.startsWith("data:")) {
                        dataLines.push(line.slice(5).trimStart());
                    }
                }

                if (dataLines.length > 0) {
                    onEvent(dataLines.join("\n"));
                }
            }
        },
        flush() {
            const remaining = buffer.trim();
            if (!remaining) {
                return;
            }

            const lines = remaining.split(/\r?\n/);
            const dataLines = [];
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    dataLines.push(line.slice(5).trimStart());
                }
            }

            if (dataLines.length > 0) {
                onEvent(dataLines.join("\n"));
            }
            buffer = "";
        }
    };
}

module.exports = {
    createSseParser
};
