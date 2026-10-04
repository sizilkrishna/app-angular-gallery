import { Resource } from '@angular/core';

/**
 * In Angular 22 `resource.value()` throws while the resource is in an error state. This reads it
 * safely (undefined while loading or failed) so templates, computeds and effects never blow up.
 */
export function valueOf<T>(res: Resource<T | undefined>): T | undefined {
  return res.hasValue() ? res.value() : undefined;
}
