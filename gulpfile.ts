import gulp from 'gulp'
import { Gulp } from '@teneo/dev'
const tasks = await Gulp.tasks(import.meta.url)
tasks.apply(gulp)
