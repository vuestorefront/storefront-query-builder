export default interface SortArgument {
  field: string
  options?: SortOptions|string
}

export interface SortOptions {
  order?: string
  mode?: string
  missing?: string
  unmapped_type?: string,
  [option: string]: any
}
