const write = (level, event, data = {}) => {
    const entry = {
        level,
        event,
        ...data,
        timestamp: new Date().toISOString(),
    }

    const line = JSON.stringify(entry)

    if (level === 'error') {
        console.error(line)
    } else if (level === 'warn') {
        console.warn(line)
    } else {
        console.log(line)
    }
}

const log = {
    info: (event, data) => write('info', event, data),
    warn: (event, data) => write('warn', event, data),
    error: (event, data) => write('error', event, data),
}

module.exports = log
