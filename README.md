# DIPC clock-in software
A software that will track it's users' clock-in and clock-out times. 
- [DIPC clock-in software](#dipc-clock-in-software)
  - [About the project](#about-the-project)
  - [Getting started](#getting-started)
    - [Requirements](#requirements)
    - [Installing](#installing)
  - [Contributing](#contributing)
  - [Authors](#authors)
  - [License](#license)

---

## About the project
This project aims to be the software that DIPC uses to register and track it's users working hours, to be able to abide by the Spanish law.

In order to do so, we've implemented a front-end web application made with [Angular](https://angular.io/) and hosted with [Nginx](https://www.nginx.com/), and a back-end restful API made with [ExpressJS](https://expressjs.com/), connected to a [MariaDB](https://mariadb.org/) database that stores information about times and issues of it's users.

This project uses [Vagrant](https://www.vagrantup.com/) for testing and development purposes, but it doesn't require a Vagrant machine for production. The restful API uses [Bunyan](https://github.com/trentm/node-bunyan) for logging and [PM2](https://pm2.keymetrics.io/) to monitor the proccess.

---

## Getting started

### Requirements
* A server to host both the front-end application and the restful API, as well as root privileges. All of the tests have been made on a CentOS 7 OS.

### Installing
Once you have the server up and running, following the [Vagrantfile](./Vagrantfile) provisioning script should set everything up. Keep in mind that some paths might need modifications (/vagrant directory won't exist, you might need to scp the required files, for example). Once the provisioning script has been run:

1. MariaDB setup: Make a secure installation, import the database dump and flush privileges.
```
# mysql_secure_installation
# mysql -u root -p < /opt/clock-in_server/dbdump.sql
# mysql -u root -p -e "FLUSH PRIVILEGES"
```
2. Add node_modules executables to PATH (for bunyan).
```
# echo "export PATH=\"$PATH:/opt/clock-in_server/node_modules/.bin/\"" >> ~/.bashrc
# source ~/.bashrc
```
3. PM2 installation.
```
# npm install pm2 -g
```
4. Remove SELinux. Modify /etc/sysconfig/selinux SELINUX variable to disabled.
```
# setenforce 0
# vim /etc/sysconfig/selinux
```
5. Front-end application build. Move nginx.conf to /etc/nginx/nginx.conf, build the application and restart the server. ($REPOSITORY_PATH=wherever nginx.conf is located)
```
# mv $REPOSITORY_PATH/nginx.conf /etc/nginx/nginx.conf
# cd /var/www/html && ng build --prod
# systemctl restart nginx
```
6. PM2 configuration (read [documentation](https://pm2.keymetrics.io/docs/usage/quick-start/) first). Run ecosystem, generate systemd unit block, save PM2 status for unit block.
```
# cd /opt/clock-in_server && pm2 start ecosystem.config.js --env production
# mv $REPOSITORY_PATH/pm2-root.service /etc/systemd/system/pm2-root.service
# pm2 save
```
7. TCP Wrapper configuration.
```
# mv $REPOSITORY_PATH/hosts.* /etc/
```

At this point, both the front-end application and the back-end API should be running. The Angular application should be running in port 80 of your machine and the API in port 8080 (unless specified otherwise in /etc/nginx/nginx.conf or /opt/clock-in_server/index.js respectively). You can monitor the status of the API proccess running:

```
# pm2 monit
```
or 
```
# pm2 ls 
```

Error log is stored in /opt/clock-in_server/error.log and can be parsed using Bunyan:

```
# cat /opt/clock-in_server/error.log | /opt/clock-in_server/node_modules/.bin/bunyan
```

If you ever need to make any changes to the API code, you can run the following command to apply your changes with 0 downtime:
```
# pm2 reload /opt/clock-in_server/ecosystem.config.js --env production
```

Changes to Angular application are applied building the new code and restarting Nginx proccess:
```
# cd /var/www/html && ng build --prod
# systemctl restart nginx
```

Please let me know if you find that something is missing.

---

## Contributing

Any bug-fixes, improvements or other kinds of feedback are welcome. You can always open an issue in this project, make a pull request or even send me a personal email. Don't refrain from contacting me if you think I can help you with your installation :D.

---

## Authors

* **[Urko Lekuona](https://github.com/UrkoLekuona)**

See also the list of [contributors](https://github.com/UrkoLekuona/clock-in-software/graphs/contributors) who participated in this project.

---

## License

This project is licensed under the GNU GENERAL PUBLIC License - see the [LICENSE](LICENSE) file for details