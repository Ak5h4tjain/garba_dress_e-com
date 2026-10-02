// Kafka Event Bus Simulation
// Handles distributed event topics, message publishing, consumer groups, offsets, and replay

class KafkaSimulator {
  constructor() {
    this.topics = new Map();
    this.subscribers = new Map(); // topic -> Array of handler functions
    this.globalListeners = []; // listener functions for all events (e.g. for WebSocket broadcast)
    this.messageLog = []; // persistent offset log
    this.offset = 0;
  }

  registerTopic(topicName) {
    if (!this.topics.has(topicName)) {
      this.topics.set(topicName, {
        name: topicName,
        createdAt: new Date().toISOString(),
        messagesCount: 0
      });
      this.subscribers.set(topicName, []);
    }
  }

  // Publish event to a Kafka topic
  publish(topic, key, payload) {
    this.registerTopic(topic);
    this.offset++;

    const eventRecord = {
      offset: this.offset,
      topic,
      key: key || "key_" + Math.random().toString(36).substring(2, 7),
      payload,
      timestamp: new Date().toISOString(),
      partition: Math.floor(Math.random() * 3) // simulate 3 partitions
    };

    // Append to Kafka commit log
    this.messageLog.push(eventRecord);
    const topicMeta = this.topics.get(topic);
    if (topicMeta) topicMeta.messagesCount++;

    // Trigger topic specific consumers
    const consumers = this.subscribers.get(topic) || [];
    consumers.forEach(consumer => {
      try {
        consumer(eventRecord);
      } catch (err) {
        console.error(`Error in Kafka consumer for topic [${topic}]:`, err);
      }
    });

    // Trigger global stream listeners (e.g., WebSocket broadcaster)
    this.globalListeners.forEach(listener => {
      try {
        listener(eventRecord);
      } catch (err) {
        console.error("Error in Kafka global stream listener:", err);
      }
    });

    return eventRecord;
  }

  // Subscribe a consumer group handler
  subscribe(topic, handler) {
    this.registerTopic(topic);
    this.subscribers.get(topic).push(handler);
    return () => {
      const list = this.subscribers.get(topic);
      const idx = list.indexOf(handler);
      if (idx > -1) list.splice(idx, 1);
    };
  }

  onAnyMessage(listener) {
    this.globalListeners.push(listener);
    return () => {
      const idx = this.globalListeners.indexOf(listener);
      if (idx > -1) this.globalListeners.splice(idx, 1);
    };
  }

  getMessageLog(limit = 100, topicFilter = null) {
    let logs = this.messageLog;
    if (topicFilter) {
      logs = logs.filter(m => m.topic === topicFilter);
    }
    return logs.slice(-limit).reverse();
  }

  getTopicsSummary() {
    return Array.from(this.topics.values());
  }
}

export const kafka = new KafkaSimulator();
