#### 关于tsconfig.json

###### compilerOptions.typeRoots

~~~json
{
    "compilerOptions": {
    	"typeRoots": ["./typings"]
	}
}
~~~

`typeRoots` 选项在 TypeScript 中没有默认值，如果不显式指定，TypeScript 将按照默认规则查找`.d.ts`文件。默认情况下，TypeScript 会在以下位置查找类型声明文件：

1. 当前项目的根目录下的 `node_modules/@types` 目录：TypeScript 会自动搜索 `node_modules/@types` 目录以查找第三方库的类型声明文件。
2. 当前项目的根目录下的 `typings` 目录：如果存在 `typings` 目录，TypeScript 也会在其中查找类型声明文件。
3. 在 `include` 选项中指定的文件或文件夹：如果你在 `include` 选项中指定了文件或文件夹，TypeScript 会在这些位置查找`.d.ts`文件。

总之，虽然`typeRoots`选项可以用来明确指定`.d.ts`文件的根目录，但在大多数情况下，你不需要显式指定它，因为 TypeScript 会按照上述默认规则查找类型声明文件。如果你的项目结构符合默认规则，TypeScript 将自动找到并使用`.d.ts`文件。



###### include

~~~json
{
	"include": [
    "src/**/*.ts", // 包含 src 目录及其子目录中的所有 .ts 文件
    "typings/**/*.d.ts" // 包含 typings 目录及其子目录中的所有 .d.ts 文件
	]
}
~~~

如果你不在 `tsconfig.json` 文件中显式设置 `include` 选项，TypeScript 将按照默认规则查找并包含项目中的 TypeScript 文件和声明文件，这通常会包括项目根目录下的所有 TypeScript 文件和声明文件，以及子目录中的文件。

这种默认行为可能在某些情况下是合适的，特别是对于小型项目或具有简单目录结构的项目。TypeScript 将尝试包含项目中的所有 TypeScript 文件，从而简化了配置。

但需要注意的是，在大型项目或具有复杂目录结构的项目中，不显式设置 `include` 可能会导致 TypeScript 处理大量不必要的文件，从而增加了编译时间和资源消耗。因此，对于大型项目，通常建议显式设置 `include`，以便只包含需要编译的文件。

总之，如果不设置 `include`，TypeScript 将按照默认规则尝试包含项目中的所有 TypeScript 文件和声明文件。这种默认行为在小型项目中可能适用，但在大型项目中，显式设置 `include` 可能更加可控和高效。



#### 自定义包

~~~powershell
D:\LEARNCODE\BACKEND\GO\ALIST-WEB\MYPACKAGE
│  package.json
│  
└─dist
        index.d.ts
        index.js
        sub.d.ts
        sub.js
~~~

###### packageJson 配置

踩了一天坑

~~~json
{
  "name": "mypackage",
  "version": "1.0.0",
  "description": "hahaha",
  //主包的类型提示  不能以 "."的形式放在 typesVersions 里面 
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ], 
  //build 这两个就可以了
  "exports": {
    ".": {
      "import": "./dist/index.js"
    },
    "./sub": {
      "import": "./dist/sub.js"
    }
  },
    
  //子包的类型提示
  "typesVersions": {
    "*": {
      "sub": [
        "./dist/sub.d.ts"
      ]
    }
  },
  "author": "",
  "license": "ISC"
}
~~~

