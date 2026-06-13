import type { JSONSchema7 } from '@low-code/shared';

/** Schema 注册项 */
export interface SchemaRegistration {
  schemaId: string;
  engine: string;
  scene: string;
  name: string;
  version: string;
  schema: JSONSchema7;
  controls?: string[];
}

/**
 * Schema 注册中心
 * 管理各引擎注册的 JSON Schema
 */
export class SchemaRegistryImpl {
  private entries = new Map<string, SchemaRegistration>();

  register(entry: SchemaRegistration): void {
    this.entries.set(entry.schemaId, entry);
  }

  get(schemaId: string): SchemaRegistration | null {
    return this.entries.get(schemaId) || null;
  }

  listByEngine(engine: string): SchemaRegistration[] {
    return Array.from(this.entries.values()).filter((e) => e.engine === engine);
  }

  listByScene(scene: string): SchemaRegistration[] {
    return Array.from(this.entries.values()).filter((e) => e.scene === scene);
  }

  list(): SchemaRegistration[] {
    return Array.from(this.entries.values());
  }

  update(schemaId: string, schema: JSONSchema7): void {
    const existing = this.entries.get(schemaId);
    if (existing) {
      this.entries.set(schemaId, { ...existing, schema });
    }
  }

  remove(schemaId: string): void {
    this.entries.delete(schemaId);
  }

  export(): SchemaRegistration[] {
    return this.list();
  }

  import(entries: SchemaRegistration[]): void {
    this.entries.clear();
    for (const entry of entries) {
      this.register(entry);
    }
  }
}

export const schemaRegistry = new SchemaRegistryImpl();
