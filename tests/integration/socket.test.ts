/**
 * Realtime WebSockets / Socket.IO Integration Tests
 * Tests live connection, bidirectional events, broadcast delivery, and latency
 */

import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { app, httpServer, io, resetTestDatabase } from '../../server.js';
import type { AddressInfo } from 'net';

describe('SOL Global - Socket.IO Realtime Integration Tests', () => {
  let serverPort: number;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;

  beforeAll((done) => {
    resetTestDatabase();
    // Start HTTP server on ephemeral port for tests
    httpServer.listen(0, () => {
      const addr = httpServer.address() as AddressInfo;
      serverPort = addr.port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();
    io.close();
    httpServer.close(() => {
      done();
    });
  });

  beforeEach((done) => {
    let connectedCount = 0;
    const checkDone = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };

    const serverUrl = `http://localhost:${serverPort}`;
    clientSocket1 = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
    });
    clientSocket2 = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
    });

    clientSocket1.on('connect', checkDone);
    clientSocket2.on('connect', checkDone);
  });

  afterEach(() => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();
  });

  it('1. should establish active WebSocket connections for multiple clients simultaneously', () => {
    expect(clientSocket1.connected).toBe(true);
    expect(clientSocket2.connected).toBe(true);
    expect(clientSocket1.id).toBeDefined();
    expect(clientSocket2.id).toBeDefined();
    expect(clientSocket1.id).not.toBe(clientSocket2.id);
  });

  it('2. should respond to ping with pong with ultra-low latency (<50ms)', (done) => {
    const startTime = Date.now();
    clientSocket1.emit('ping');
    clientSocket1.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - startTime;
      expect(data).toHaveProperty('timestamp');
      expect(latency).toBeLessThan(50);
      done();
    });
  });

  it('3. should broadcast "livestock:scanned" event to all active clients when RFID is scanned', (done) => {
    let receivedCount = 0;
    const expectedTag = 'RFID-CTL-9055';

    const onScanned = (payload: any) => {
      expect(payload).toHaveProperty('rfidTag', expectedTag);
      expect(payload).toHaveProperty('status', 'INGESTED');
      expect(payload).toHaveProperty('cow');
      receivedCount++;
      if (receivedCount === 2) {
        done();
      }
    };

    clientSocket1.on('livestock:scanned', onScanned);
    clientSocket2.on('livestock:scanned', onScanned);

    // Trigger REST API scan which should broadcast to both sockets
    request(app)
      .post('/api/livestock/scan')
      .send({
        rfidTag: expectedTag,
        checkpointLocation: 'Mila Feedlot Scale #2',
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res) => {
        expect(res.body.rfidTag).toBe(expectedTag);
      });
  });

  it('4. should broadcast "iot:telemetry_update" and "cooling_alert" to clients when collar telemetry arrives', (done) => {
    const testTag = 'RFID-CTL-9021';
    let telemetryReceived = false;
    let alertReceived = false;

    const checkComplete = () => {
      if (telemetryReceived && alertReceived) {
        done();
      }
    };

    clientSocket1.on('iot:telemetry_update', (payload: any) => {
      if (payload?.data?.rfidTag === testTag) {
        expect(payload).toHaveProperty('type', 'collar');
        expect(payload.data.thiIndex).toBeGreaterThanOrEqual(75);
        telemetryReceived = true;
        checkComplete();
      }
    });

    clientSocket2.on('cooling_alert', (alert: any) => {
      if (alert?.rfidTag === testTag) {
        expect(alert).toHaveProperty('action', 'EMERGENCY_COOLING_PROTOCOL_ENGAGED');
        expect(alert.intervention.tunnelFanSpeedPct).toBe(100);
        alertReceived = true;
        checkComplete();
      }
    });

    // Ingest telemetry via API
    request(app)
      .post('/api/iot/ingest')
      .send({
        topic: `sol/iot/livestock/${testTag}/telemetry`,
        type: 'collar',
        data: {
          deviceId: 'COLLAR-9021',
          rfidTag: testTag,
          cowName: 'Texas Queen #21',
          wilaya: 'Adrar',
          ambientTempC: 43.0,
          relativeHumidityPct: 24.0,
          thiIndex: 84.5,
          coolingAlertActive: true,
          coolingIntervention: {
            tunnelFanSpeedPct: 100,
            sprinklerIntervalMinutes: 3,
            mistingActive: true,
            rumenBufferSupplementGrams: 280,
          },
        },
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .end((err) => {
        if (err) done(err);
      });
  });

  it('5. should gracefully handle client disconnect and reconnect without crashing server', (done) => {
    clientSocket1.disconnect();
    expect(clientSocket1.connected).toBe(false);

    // Reconnect client
    clientSocket1.connect();
    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });
});
