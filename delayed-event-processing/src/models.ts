export interface Criteria {
    matchPath: string;
    matchValue: string;
    parameterPath: string;
    delayInMinutes: number;
}

export enum LogLevel {
    ERROR = 'ERROR',
    WARNING = 'WARNING'
}

export interface LogMessage {
    level: LogLevel,
    service: string;
    message: string;
    receivedAt: string;
}

export interface DBLogMessage extends LogMessage {
    pk: string;
    sk: string;
    gsi1_pk: string;
    gsi1_sk: string;
    parameterValue: string;
    dueAt: string;
}
