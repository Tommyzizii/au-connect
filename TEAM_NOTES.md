## Project setup instructions 

Before you run the project, once the projects been cloned locally
you have to run 
`pnpm install`

To run this project you can use the command 
`pnpm run dev`

This project uses pnpm which is similar to npm so any packages u want to install, use the command

`pnpm add package_name`


## Project structure information 

- Most of the project files will be in the `app/`
- In the `app/` folder there is the `api/` folder which is to for api endpoints
- endpoints related to the authentication can be added in the `(auth)/` folder
- The `public/` is for static assets you want to serve as-is at runtime.
- The `lib/` folder is for static helper functions 
- The `prisma/` folder is for defining the model/schema for the projects 
- The `component/` folder is for any reusable react-componenets

## Currently Added Dependencies:

-- default --
next 16.0.1
react 19.2.0
react-dom 19.2.0

-- prisma related -- 
@prisma/client 6.19.0
prisma 6.19.0

-- auth related --
next-auth 4.24.13
@auth/prisma-adapter 2.11.1

### can also use `pnpm list` to check dependencies