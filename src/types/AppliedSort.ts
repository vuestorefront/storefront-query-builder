import { SortOptions } from './SortArgument'

export default interface AppliedSort {
  field: string
  options: SortOptions|string
}
